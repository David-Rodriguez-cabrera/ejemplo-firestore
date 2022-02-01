import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tarea } from '../tarea';
import { FirestoreService } from '../firestore.service';
import { AlertController } from '@ionic/angular';
import { LoadingController, ToastController } from '@ionic/angular';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { Router } from '@angular/router';
@Component({
  selector: 'app-detalle',
  templateUrl: './detalle.page.html',
  styleUrls: ['./detalle.page.scss'],
})
export class DetallePage implements OnInit {
  imagenTempSrc: String;

  subirArchivoImagen: boolean = false;
  borrarArchivoImagen: boolean = false;

  // Nombre de la colección en Firestore Database
  // coleccion: String = "EjemploImagenes";
id: string = "";

document: any = {
  id: "",
  data: {} as Tarea
};

  constructor(private firestoreService: FirestoreService, 
    private activateRoute: ActivatedRoute,
     public alertController: AlertController,
     private loadingController: LoadingController,
     private toastController: ToastController,
     private imagePicker: ImagePicker, 
     private router: Router) { 

      this.document.id = "ID_ImagenDePrueba";
      this.ngOnInit();
     }

  ngOnInit() {
    this.id = this.activateRoute.snapshot.paramMap.get('id');
    this.firestoreService.consultarPorId("tareas", this.id).subscribe((resultado) => {
      // Preguntar si se hay encontrado un document con ese ID
      if(resultado.payload.data() != null) {
        this.document.id = resultado.payload.id
        this.document.data = resultado.payload.data();
        this.imagenTempSrc = this.document.data.imagen;
        //console.log(this.document.data.imagen);
      //   if (this.document.data.imagen == undefined){
      //   this.document.data.imagen = 'https://canalcocina.es/medias/_cache/zoom-cfb51745176980ddf03e20382b32760d-920-518.jpg'; 
      // }
        // Como ejemplo, mostrar el título de la tarea en consola
        console.log(this.document.data.titulo);
      } else {
        // No se ha encontrado un document con ese ID. Vaciar los datos que hubiera
        this.document.data = {} as Tarea;
        
      } 
    });
  }

  clickBotonInsertar() {
    this.firestoreService.insertar("tareas", this.document.data)
    .then(() =>{
      console.log("Tarea creada correctamente")
      // Limpiar el contenido de la tarea que se estaba editando
      this.document.data = {} as Tarea;
    }, (error) => {
      console.error(error);
    });

  }

 

  clicBotonBorrar() {
    
    this.firestoreService.borrar("tareas", this.id).then(() => {
      // Actualizar la lista completa
      this.ngOnInit();
      // Limpiar datos de pantalla
      this.document.data = {} as Tarea;
    })
  }



  clicBotonModificar() {
    this.firestoreService.actualizar("tareas", this.id, this.document.data).then(() => {
      // Actualizar la lista completa
      this.ngOnInit();
      // Limpiar datos de pantalla
      this.document.data = {} as Tarea;
      
    })
    this.router.navigate(['/home']);
  }
  clicVolver() {
    
    this.router.navigate(['/home']);
  }
  
  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Cuidado!',
      message: 'Desea <strong>Eliminar</strong>!!!',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Confirm Cancel: blah');
          },
        },
        {
          text: 'Okay',
          handler: () => {
            console.log('Confirm Okay');
            this.clicBotonBorrar();
          },
        },
      ],
    });
    await alert.present();
  }

  async seleccionarImagen() {
    // Comprobar si la aplicación tiene permisos de lectura
    this.imagePicker.hasReadPermission().then(
      (result) => {
        // Si no tiene permiso de lectura se solicita al usuario
        if(result == false){
          this.imagePicker.requestReadPermission();
        }
        else {
          // Abrir selector de imágenes (ImagePicker)
          this.imagePicker.getPictures({
            maximumImagesCount: 1,  // Permitir sólo 1 imagen
            outputType: 1           // 1 = Base64
          }).then(
            (results) => {  // En la variable results se tienen las imágenes seleccionadas
              if(results.length > 0) { // Si el usuario ha elegido alguna imagen
                this.imagenTempSrc = "data:image/jpeg;base64,"+results[0];
                console.log("Imagen que se ha seleccionado (en Base64): " + this.imagenTempSrc);
                // Se informa que se ha cambiado para que se suba la imagen cuando se actualice la BD
                this.subirArchivoImagen = true;
                this.borrarArchivoImagen = false;
              }
            },
            (err) => {
              console.log(err)
            }
          );
        }
      }, (err) => {
        console.log(err);
      });
  }

  public guardarDatos() {
    if(this.subirArchivoImagen) {
      // Si la imagen es nueva se sube como archivo y se actualiza la BD
      if(this.document.data.imagenURL != null){
        this.eliminarArchivo(this.document.data.imagen);
      }
      this.subirImagenActualizandoBD();
    } else {
      if(this.borrarArchivoImagen) {
        this.eliminarArchivo(this.document.data.imagen);        
        this.document.data.imagen = null;
      }
      // Si no ha cambiado la imagen no se sube como archivo, sólo se actualiza la BD
      this.actualizarBaseDatos();
    }
  }
  async subirImagenActualizandoBD(){
    // Mensaje de espera mientras se sube la imagen
    const loading = await this.loadingController.create({
      message: 'Please wait...'
    });
    // Mensaje de finalización de subida de la imagen
    const toast = await this.toastController.create({
      message: 'Image was updated successfully',
      duration: 3000
    });
    // Carpeta del Storage donde se almacenará la imagen
    let nombreCarpeta = "imagenes";

    // Mostrar el mensaje de espera
    loading.present();
    // Asignar el nombre de la imagen en función de la hora actual para
    //  evitar duplicidades de nombres         
    let nombreImagen = `${new Date().getTime()}`;
    // Llamar al método que sube la imagen al Storage
    this.firestoreService.uploadImage(nombreCarpeta, nombreImagen, this.imagenTempSrc)
      .then(snapshot => {
        snapshot.ref.getDownloadURL()
          .then(downloadURL => {
            // En la variable downloadURL se tiene la dirección de descarga de la imagen
            console.log("downloadURL:" + downloadURL);
            //this.document.data.imagenURL = downloadURL;            
            // Mostrar el mensaje de finalización de la subida
            toast.present();
            // Ocultar mensaje de espera
            loading.dismiss();

            // Una vez que se ha termninado la subida de la imagen 
            //    se actualizan los datos en la BD
            this.document.data.imagen = downloadURL;
            this.actualizarBaseDatos();
          })
      })    
  } 

  public borrarImagen() {
    // No mostrar ninguna imagen en la página
    this.imagenTempSrc = null;
    // Se informa que no se debe subir ninguna imagen cuando se actualice la BD
    this.subirArchivoImagen = false;
    this.borrarArchivoImagen = true;
  }

  async eliminarArchivo(fileURL) {
    const toast = await this.toastController.create({
      message: 'File was deleted successfully',
      duration: 3000
    });
    this.firestoreService.deleteFileFromURL(fileURL)
      .then(() => {
        toast.present();
      }, (err) => {
        console.log(err);
      });
  }

  private actualizarBaseDatos() {    
    console.log("Guardando en la BD: ");
    console.log(this.document.data);
    this.firestoreService.actualizar("tareas", this.document.id, this.document.data);
  }

//   async uploadImagePicker() {
//     console.log("patata");
//     // Mensaje de espera mientras se sube la imagen
//     const loading = await this.loadingController.create({
//       message: 'Please wait'
//     });
//     // Mensaje de finalización de subida de la imagen
//     const toast = await this.toastController.create({
//       message: 'Image was updated successfully',
//       duration: 3000
//     });
//     // Comprobar si la aplicación tiene permisos de lectura
//     console.log("patata2");
//     this.imagePicker.hasReadPermission().then(
//       (result) => {
//         // Si no tiene permiso de lectura se solicita al usuario
//         if(result == false){
//           this.imagePicker.requestReadPermission();
//           console.log("patata3");
//         }
        
//         // Abrir selector de imágenes (ImagePicker)
//         else {
//           console.log("patata4");
//           this.imagePicker.getPictures ({
//             maximumImagesCount: 1, // Permitir sólo 1 imagen
//             outputType: 1 // 1 = Base 64
//           }).then(
//             (results) => {  // En la variable results se tienen las imágenes seleccionadas
//               // Carpeta del Storage donde se almacenará la imagen
//               let nombreCarpeta = "imagenes";
//               // Recorrer todas las imágenes que haya seleccionado el usuario
//               // aunque realmente sólo será 1 como se ha indicado en las opciones
//               //console.log(results.length);
//               if(results.length > 0) {
//               //for (var i = 0; i < results.length; i++){
//                 // Mostrar el mensaje de espera
//                 loading.present();
//                 // Asignar el nombre de la imagen en función de la hora actual para
//                 // evitar duplicidades de nombres
//                 let nombreImagen = `${new Date().getTime()}`;
//                 // Llamar al método que sube la imagen al Storage
//                 console.log("patatafin");
//                 this.firestoreService.uploadImage(nombreCarpeta, nombreImagen,
//                   results[0])
//                               .then(snapshot =>{
//                                 snapshot.ref.getDownloadURL()
//                                   .then(downloadUrl => {
//                                     // En la variable downloadURL se tiene la dirección de descarga de la imagen
//                                       console.log("downloadURL:" + downloadUrl);
//                                       this.document.data.imagen = downloadUrl;  
//                                       // Mostrar el mensaje de finalización de la subida
//                                       toast.present();
//                                       // Ocultar mensaje de espera
//                                       loading .dismiss();
//                                   })
//                               })
                          
                          
//               }

//             },
//             (err) => {
//               console.log(err)
//             }
//           );
//           }
        
//         },
//      (err) => {
//         console.log(err);
//       });
//   }
// async deleteFile(fileUrl){
//   //this.document.data.imagen = null;
//   const toast = await this.toastController.create({
//     message: 'File was deleted successfully',
//     duration: 3000
//   });
//   //this.document.data.imagen = fileUrl; 
//   this.firestoreService.deleteFileFromURL(fileUrl)
//     .then(() =>{
//       this.document.data.imagen = null;
//       toast.present();
    
//     }, (err) => {
//       console.log(err);
//     });
// }




}


